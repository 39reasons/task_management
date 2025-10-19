import { gql } from "@apollo/client";

export const WORK_ITEM_FRAGMENT = gql`
  fragment WorkItemFields on WorkItem {
    id
    type
    task_kind
    title
    description
    status
    priority
    estimate
    due_date
    position
    project_id
    team_id
    stage_id
    backlog_id
    sprint_id
    assignee_id
    assignee {
      id
      first_name
      last_name
      username
      avatar_color
    }
    parent_id
    created_at
    updated_at
    task {
      id
      task_kind
      status
    }
    tags {
      id
      name
      color
    }
    comments {
      id
      work_item_id
      user_id
      content
      created_at
      updated_at
      user {
        id
        first_name
        last_name
        username
        avatar_color
      }
    }
    children {
      id
      type
      title
      status
      parent_id
    }
  }
`;

export const GET_WORK_ITEM = gql`
  query GetWorkItem($id: ID!) {
    workItem(id: $id) {
      ...WorkItemFields
      parent {
        id
        type
        title
      }
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const LIST_WORK_ITEMS = gql`
  query ListWorkItems($project_id: ID, $team_id: ID, $types: [WorkItemType!], $parent_id: ID) {
    workItems(project_id: $project_id, team_id: $team_id, types: $types, parent_id: $parent_id) {
      ...WorkItemFields
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const CREATE_WORK_ITEM = gql`
  mutation CreateWorkItem($input: CreateWorkItemInput!) {
    createWorkItem(input: $input) {
      ...WorkItemFields
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const UPDATE_WORK_ITEM = gql`
  mutation UpdateWorkItem($id: ID!, $input: UpdateWorkItemInput!) {
    updateWorkItem(id: $id, input: $input) {
      ...WorkItemFields
      parent {
        id
        type
        title
      }
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const SET_WORK_ITEM_ASSIGNEE = gql`
  mutation SetWorkItemAssignee($work_item_id: ID!, $assignee_id: ID) {
    setWorkItemAssignee(work_item_id: $work_item_id, assignee_id: $assignee_id) {
      ...WorkItemFields
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const ASSIGN_TAG_TO_WORK_ITEM = gql`
  mutation AssignTagToWorkItem($work_item_id: ID!, $tag_id: ID!) {
    assignTagToWorkItem(work_item_id: $work_item_id, tag_id: $tag_id) {
      ...WorkItemFields
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const REMOVE_TAG_FROM_WORK_ITEM = gql`
  mutation RemoveTagFromWorkItem($work_item_id: ID!, $tag_id: ID!) {
    removeTagFromWorkItem(work_item_id: $work_item_id, tag_id: $tag_id) {
      ...WorkItemFields
    }
  }
  ${WORK_ITEM_FRAGMENT}
`;

export const ADD_WORK_ITEM_COMMENT = gql`
  mutation AddWorkItemComment($input: WorkItemCommentInput!) {
    addWorkItemComment(input: $input) {
      id
      work_item_id
      user_id
      content
      created_at
      updated_at
      user {
        id
        first_name
        last_name
        username
        avatar_color
      }
    }
  }
`;

export const UPDATE_WORK_ITEM_COMMENT = gql`
  mutation UpdateWorkItemComment($input: UpdateWorkItemCommentInput!) {
    updateWorkItemComment(input: $input) {
      id
      work_item_id
      user_id
      content
      created_at
      updated_at
      user {
        id
        first_name
        last_name
        username
        avatar_color
      }
    }
  }
`;

export const DELETE_WORK_ITEM_COMMENT = gql`
  mutation DeleteWorkItemComment($id: ID!) {
    deleteWorkItemComment(id: $id)
  }
`;

export const LINK_WORK_ITEMS = gql`
  mutation LinkWorkItems($parent_id: ID!, $child_id: ID!) {
    linkWorkItems(input: { parent_id: $parent_id, child_id: $child_id })
  }
`;

export const UNLINK_WORK_ITEMS = gql`
  mutation UnlinkWorkItems($parent_id: ID!, $child_id: ID!) {
    unlinkWorkItems(input: { parent_id: $parent_id, child_id: $child_id })
  }
`;
