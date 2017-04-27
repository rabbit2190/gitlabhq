/* global ListUser */
/* global ListLabel */
/* global listObj */
/* global ListIssue */

import Vue from 'vue';

require('~/boards/models/issue');
require('~/boards/models/label');
require('~/boards/models/list');
require('~/boards/models/user');
require('~/boards/stores/boards_store');
require('~/boards/components/issue_card_inner');
require('./mock_data');

describe('Issue card component', () => {
  const user = new ListUser({
    id: 1,
    name: 'testing 123',
    username: 'test',
    avatar: 'test_image',
  });
  const label1 = new ListLabel({
    id: 3,
    title: 'testing 123',
    color: 'blue',
    text_color: 'white',
    description: 'test',
  });
  let component;
  let issue;
  let list;

  beforeEach(() => {
    setFixtures('<div class="test-container"></div>');

    list = listObj;
    issue = new ListIssue({
      title: 'Testing',
      iid: 1,
      confidential: false,
      labels: [list.label],
      assignees: [],
    });

    component = new Vue({
      el: document.querySelector('.test-container'),
      data() {
        return {
          list,
          issue,
          issueLinkBase: '/test',
          rootPath: '/',
        };
      },
      components: {
        'issue-card': gl.issueBoards.IssueCardInner,
      },
      template: `
        <issue-card
          :issue="issue"
          :list="list"
          :issue-link-base="issueLinkBase"
          :root-path="rootPath"></issue-card>
      `,
    });
  });

  it('renders issue title', () => {
    expect(
      component.$el.querySelector('.card-title').textContent,
    ).toContain(issue.title);
  });

  it('includes issue base in link', () => {
    expect(
      component.$el.querySelector('.card-title a').getAttribute('href'),
    ).toContain('/test');
  });

  it('includes issue title on link', () => {
    expect(
      component.$el.querySelector('.card-title a').getAttribute('title'),
    ).toBe(issue.title);
  });

  it('does not render confidential icon', () => {
    expect(
      component.$el.querySelector('.fa-eye-flash'),
    ).toBeNull();
  });

  it('renders confidential icon', (done) => {
    component.issue.confidential = true;

    Vue.nextTick(() => {
      expect(
        component.$el.querySelector('.confidential-icon'),
      ).not.toBeNull();
      done();
    });
  });

  it('renders issue ID with #', () => {
    expect(
      component.$el.querySelector('.card-number').textContent,
    ).toContain(`#${issue.id}`);
  });

  describe('assignee', () => {
    it('does not render assignee', () => {
      expect(
        component.$el.querySelector('.card-assignee .avatar'),
      ).toBeNull();
    });

    describe('exists', () => {
      beforeEach((done) => {
        component.issue.assignees = [user];

        Vue.nextTick(() => done());
      });

      it('renders assignee', () => {
        expect(
          component.$el.querySelector('.card-assignee .avatar'),
        ).not.toBeNull();
      });

      it('sets title', () => {
        expect(
          component.$el.querySelector('.card-assignee a').getAttribute('title'),
        ).toContain(`Assigned to ${user.name}`);
      });

      it('sets users path', () => {
        expect(
          component.$el.querySelector('.card-assignee a').getAttribute('href'),
        ).toBe('/test');
      });

      it('renders avatar', () => {
        expect(
          component.$el.querySelector('.card-assignee img'),
        ).not.toBeNull();
      });
    });
  });

  describe('multiple assignees', () => {
    beforeEach((done) => {
      component.issue.assignees = [
        user,
        new ListUser({
          id: 2,
          name: 'user2',
          username: 'user2',
          avatar: 'test_image',
        }),
        new ListUser({
          id: 3,
          name: 'user3',
          username: 'user3',
          avatar: 'test_image',
        }),
        new ListUser({
          id: 4,
          name: 'user4',
          username: 'user4',
          avatar: 'test_image',
        })];

      Vue.nextTick(() => done());
    });

    it('renders all four assignees', () => {
      expect(component.$el.querySelectorAll('.card-assignee .avatar').length).toEqual(4);
    });


    describe('more than four assignees', () => {
      beforeEach((done) => {
        component.issue.assignees.push(new ListUser({
          id: 5,
          name: 'user5',
          username: 'user5',
          avatar: 'test_image',
        }));

        Vue.nextTick(() => done());
      });

      it('renders more avatar counter', () => {
        expect(component.$el.querySelector('.card-assignee .avatar-counter').innerText).toEqual('+2');
      });

      it('renders three assignees', () => {
        expect(component.$el.querySelectorAll('.card-assignee .avatar').length).toEqual(3);
      });

      it('renders 99+ avatar counter', (done) => {
        for(let i = 5; i < 104; i++) {
          const u = new ListUser({
            id: i,
            name: 'name',
            username: 'username',
            avatar: 'test_image',
          });
          component.issue.assignees.push(u);
        }

        Vue.nextTick(() => {
          expect(component.$el.querySelector('.card-assignee .avatar-counter').innerText).toEqual('99+');
          done();
        });
      });
    });
  })

  describe('labels', () => {
    it('does not render any', () => {
      expect(
        component.$el.querySelector('.label'),
      ).toBeNull();
    });

    describe('exists', () => {
      beforeEach((done) => {
        component.issue.addLabel(label1);

        Vue.nextTick(() => done());
      });

      it('does not render list label', () => {
        expect(
          component.$el.querySelectorAll('.label').length,
        ).toBe(1);
      });

      it('renders label', () => {
        expect(
          component.$el.querySelector('.label').textContent,
        ).toContain(label1.title);
      });

      it('sets label description as title', () => {
        expect(
          component.$el.querySelector('.label').getAttribute('title'),
        ).toContain(label1.description);
      });

      it('sets background color of button', () => {
        expect(
          component.$el.querySelector('.label').style.backgroundColor,
        ).toContain(label1.color);
      });
    });
  });
});
