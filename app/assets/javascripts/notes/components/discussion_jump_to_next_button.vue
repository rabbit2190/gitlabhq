<script>
import { GlTooltipDirective } from '@gitlab/ui';
import icon from '~/vue_shared/components/icon.vue';
import discussionNavigation from '../mixins/discussion_navigation';

export default {
  name: 'JumpToNextDiscussionButton',
  components: {
    icon,
  },
  directives: {
    GlTooltip: GlTooltipDirective,
  },
  mixins: [discussionNavigation],
  props: {
    fromDiscussionId: {
      type: String,
      required: true,
    },
  },
};
</script>

<template>
  <div class="btn-group" role="group">
    <button
      ref="button"
      v-gl-tooltip
      class="btn btn-default discussion-next-btn"
      :title="s__('MergeRequests|Jump to next unresolved thread')"
      @click="jumpToNextRelativeDiscussion(fromDiscussionId)"
    >
      <icon name="comment-next" />
    </button>
  </div>
</template>
