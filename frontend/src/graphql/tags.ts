import { gql } from "@apollo/client";

export const GET_PROJECT_TAGS = gql`
  query GetProjectTags($project_id: ID!) {
    tags(project_id: $project_id) {
      id
      name
      color
    }
  }
`;

export const GET_TASK_TAGS = gql`
  query GetTaskTags($task_id: ID!) {
    task(id: $task_id) {
      id
      title
      tags {
        id
        name
        color
      }
    }
  }
`;

export const ADD_TAG = gql`
  mutation AddTag($project_id: ID!, $name: String!, $color: String) {
    addTag(project_id: $project_id, name: $name, color: $color) {
      id
      name
      color
    }
  }
`;

export const ADD_TAG_TO_TASK = gql`
  mutation AddTagToTask($task_id: ID!, $name: String!, $color: String) {
    addTagToTask(task_id: $task_id, name: $name, color: $color) {
      id
      title
      status
      tags {
        id
        name
        color
      }
    }
  }
`;

export const ASSIGN_TAG_TO_TASK = gql`
  mutation AssignTagToTask($task_id: ID!, $tag_id: ID!) {
    assignTagToTask(task_id: $task_id, tag_id: $tag_id) {
      id
      title
      status
      tags {
        id
        name
        color
      }
    }
  }
`;

export const REMOVE_TAG_FROM_TASK = gql`
  mutation RemoveTagFromTask($task_id: ID!, $tag_id: ID!) {
    removeTagFromTask(task_id: $task_id, tag_id: $tag_id) {
      id
      title
      description
      due_date
      priority
      status
      stage_id
      project_id
      position
      assignees {
        id
        first_name
        last_name
        username
        avatar_color
      }
      stage {
        id
        name
        position
        workflow_id
      }
      tags {
        id
        name
        color
      }
    }
  }
`;

export const UPDATE_TAG = gql`
  mutation UpdateTag($id: ID!, $name: String!, $color: String) {
    updateTag(id: $id, name: $name, color: $color) {
      id
      name
      color
    }
  }
`;
