# == Schema Information
#
# Table name: services
#
#  id         :integer          not null, primary key
#  type       :string(255)
#  title      :string(255)
#  project_id :integer
#  created_at :datetime
#  updated_at :datetime
#  active     :boolean          default(FALSE), not null
#  properties :text
#  template   :boolean          default(FALSE)
#

class JiraService < IssueTrackerService
  include HTTParty
  include Rails.application.routes.url_helpers

  prop_accessor :username, :password, :api_version, :jira_issue_transition_id,
                :title, :description, :project_url, :issues_url, :new_issue_url

  before_validation :set_api_version, :set_jira_issue_transition_id

  def help
    issue_tracker_link =  help_page_path("integration", "external-issue-tracker")

    line1 = "Setting `project_url`, `issues_url` and `new_issue_url` will "\
    "allow a user to easily navigate to the Jira issue tracker. "\
    "See the [integration doc](#{issue_tracker_link}) for details."

    line2 = 'Support for referencing commits and automatic closing of Jira issues directly ' \
    'from GitLab is [available in GitLab EE.](http://doc.gitlab.com/ee/integration/jira.html)'

    [line1, line2].join("\n\n")
  end

  def title
    if self.properties && self.properties['title'].present?
      self.properties['title']
    else
      'JIRA'
    end
  end

  def description
    if self.properties && self.properties['description'].present?
      self.properties['description']
    else
      'Jira issue tracker'
    end
  end

  def to_param
    'jira'
  end

  def fields
    super.push(
      { type: 'text', name: 'username', placeholder: '' },
      { type: 'password', name: 'password', placeholder: '' },
      { type: 'text', name: 'api_version', placeholder: '2' },
      { type: 'text', name: 'jira_issue_transition_id', placeholder: '2' }
    )
  end

  def execute(push, issue = nil)
    close_issue(push, issue) if issue
  end

  def create_cross_reference_note(mentioned, noteable, author)
    issue_name = mentioned.id
    project = self.project
    noteable_name = noteable.class.name.underscore.downcase
    noteable_id = if noteable.is_a?(Commit)
                    noteable.id
                  else
                    noteable.iid
                  end

    entity_url = build_entity_url(noteable_name.to_sym, noteable_id)

    data = {
      user: {
        name: author.name,
        url: resource_url(user_path(author)),
      },
      project: {
        name: project.path_with_namespace,
        url: resource_url(namespace_project_path(project.namespace, project))
      },
      entity: {
        name: noteable_name.humanize.downcase,
        url: entity_url
      }
    }

    add_comment(data, issue_name)
  end

  private


  def set_api_version
    self.api_version ||= "2"
  end

  def set_jira_issue_transition_id
    self.jira_issue_transition_id ||= "2"
  end

  def close_issue(commit, issue)
    url = close_issue_url(issue.iid)

    commit_url = build_entity_url(:commit, commit.id)

    message = {
      update: {
        comment: [{
          add: {
            body: "Issue solved with [#{commit.id}|#{commit_url}]."
          }
        }]
      },
      transition: {
        id: jira_issue_transition_id
      }
    }.to_json

    send_message(url, message)
  end

  def add_comment(data, issue_name)
    url = add_comment_url(issue_name)
    user_name = data[:user][:name]
    user_url = data[:user][:url]
    entity_name = data[:entity][:name]
    entity_url = data[:entity][:url]
    entity_iid = data[:entity][:iid]
    project_name = data[:project][:name]
    project_url = data[:project][:url]

    message = {
      body: "[#{user_name}|#{user_url}] mentioned this issue in [a #{entity_name} of #{project_name}|#{entity_url}]."
    }.to_json

    send_message(url, message)
  end


  def auth
    require 'base64'
    Base64.urlsafe_encode64("#{self.username}:#{self.password}")
  end

  def send_message(url, message)
    result = JiraService.post(
      url,
      body: message,
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Basic #{auth}"
      }
    )

    message = case result.code
              when 201, 200
                "#{self.class.name} SUCCESS #{result.code}: Sucessfully posted to #{url}."
              when 401
                "#{self.class.name} ERROR 401: Unauthorized. Check the #{self.username} credentials and JIRA access permissions and try again."
              else
                "#{self.class.name} ERROR #{result.code}: #{result.parsed_response}"
              end

    Rails.logger.info(message)
    message
  rescue URI::InvalidURIError => e
    Rails.logger.info "#{self.class.name} ERROR: #{e.message}. Hostname: #{url}."
  end

  def server_url
    server = URI(project_url)
    default_ports = [80, 443].include?(server.port)
    server_url = "#{server.scheme}://#{server.host}"
    server_url.concat(":#{server.port}") unless default_ports
    return server_url
  end

  def resource_url(resource)
    "#{Settings.gitlab['url'].chomp("/")}#{resource}"
  end

  def build_entity_url(entity_name, entity_id)
    resource_url(
      polymorphic_url(
        [
          self.project.namespace.becomes(Namespace),
          self.project,
          entity_name
        ],
        id: entity_id,
        routing_type: :path
      )
    )
  end

  def close_issue_url(issue_name)
    "#{server_url}/rest/api/#{self.api_version}/issue/#{issue_name}/transitions"
  end

  def add_comment_url(issue_name)
    "#{server_url}/rest/api/#{self.api_version}/issue/#{issue_name}/comment"
  end
end
