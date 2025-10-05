import { gql } from "@apollo/client";

export const GET_TASKS = gql`
  query GetTasks($project_id: ID, $workflow_id: ID, $stage_id: ID) {
    tasks(project_id: $project_id, workflow_id: $workflow_id, stage_id: $stage_id) {
      id
      title
      description
      due_date
      priority
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

export const CREATE_TASK = gql`
  mutation CreateTask(
    $stage_id: ID!
    $title: String!
    $description: String
    $due_date: String
    $priority: String
  ) {
    createTask(
      stage_id: $stage_id
      title: $title
      description: $description
      due_date: $due_date
      priority: $priority
    ) {
      id
      title
      description
      due_date
      priority
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

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const UPDATE_TASK_PRIORITY = gql`
  mutation UpdateTaskPriority($id: ID!, $priority: String!) {
    updateTaskPriority(id: $id, priority: $priority) {
      id
      priority
      stage_id
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask(
    $id: ID!
    $title: String
    $description: String
    $due_date: String
    $priority: String
    $stage_id: ID
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      due_date: $due_date
      priority: $priority
      stage_id: $stage_id
    ) {
      id
      title
      description
      due_date
      priority
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

export const MOVE_TASK = gql`
  mutation MoveTask($task_id: ID!, $to_stage_id: ID!) {
    moveTask(task_id: $task_id, to_stage_id: $to_stage_id) {
      id
      stage_id
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
    }
  }
`;

export const REORDER_TASKS = gql`
  mutation ReorderTasks($stage_id: ID!, $task_ids: [ID!]!) {
    reorderTasks(stage_id: $stage_id, task_ids: $task_ids)
  }
`;

export const SET_TASK_MEMBERS = gql`
  mutation SetTaskMembers($task_id: ID!, $member_ids: [ID!]!) {
    setTaskMembers(task_id: $task_id, member_ids: $member_ids) {
      id
      assignees {
        id
        first_name
        last_name
        username
        avatar_color
      }
    }
  }
`;

export const GENERATE_TASK_DRAFT = gql`
  mutation GenerateTaskDraft($input: TaskDraftInput!) {
    generateTaskDraft(input: $input) {
      title
      description
      priority
      due_date
      tags
      subtasks
    }
  }
`;
