import { gql } from "@apollo/client";

export const TASK_FRAGMENT = gql`
  fragment TaskModalTaskFields on Task {
    id
    title
    description
    due_date
    priority
    estimate
    status
    stage_id
    backlog_id
    sprint_id
    project_id
    team_id
    position
    assignee_id
    assignee {
      id
      first_name
      last_name
      username
      avatar_color
      __typename
    }
    stage {
      id
      name
      position
      board_id
      __typename
    }
    sprint {
      id
      name
      start_date
      end_date
      __typename
    }
    tags {
      id
      name
      color
      __typename
    }
    created_at
    updated_at
    __typename
  }
`;

export const GET_TASKS = gql`
  query GetTasks(
    $team_id: ID
    $project_id: ID
    $board_id: ID
    $stage_id: ID
    $backlog_id: ID
    $sprint_id: ID
  ) {
    tasks(
      team_id: $team_id
      project_id: $project_id
      board_id: $board_id
      stage_id: $stage_id
      backlog_id: $backlog_id
      sprint_id: $sprint_id
    ) {
      id
      title
      description
      due_date
      priority
      estimate
      status
      stage_id
      backlog_id
      sprint_id
      project_id
      team_id
      position
      assignee_id
      assignee {
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
        board_id
      }
      sprint {
        id
        name
        start_date
        end_date
      }
      created_at
      updated_at
      tags {
        id
        name
        color
      }
    }
  }
`;

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      ...TaskModalTaskFields
    }
  }
  ${TASK_FRAGMENT}
`;

export const CREATE_TASK = gql`
  mutation CreateTask(
    $project_id: ID!
    $team_id: ID!
    $stage_id: ID
    $backlog_id: ID
    $sprint_id: ID
    $title: String!
    $description: String
    $due_date: String
    $priority: String
    $estimate: Int
    $status: String
  ) {
    createTask(
      project_id: $project_id
      team_id: $team_id
      stage_id: $stage_id
      backlog_id: $backlog_id
      sprint_id: $sprint_id
      title: $title
      description: $description
      due_date: $due_date
      priority: $priority
      estimate: $estimate
      status: $status
    ) {
      id
      title
      description
      due_date
      priority
      estimate
      status
      stage_id
      backlog_id
      sprint_id
      project_id
      team_id
      position
      assignee_id
      assignee {
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
        board_id
      }
      sprint {
        id
        name
        start_date
        end_date
      }
      created_at
      updated_at
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
      status
      stage_id
      backlog_id
    }
  }
`;

export const GET_TASK_HISTORY = gql`
  query GetTaskHistory($task_id: ID!, $limit: Int) {
    task(id: $task_id) {
      id
      history(limit: $limit) {
        id
        event_type
        created_at
        actor_id
        payload
        actor {
          id
          first_name
          last_name
          username
          avatar_color
        }
      }
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
    $estimate: Int
    $stage_id: ID
    $backlog_id: ID
    $sprint_id: ID
    $status: String
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      due_date: $due_date
      priority: $priority
      estimate: $estimate
      stage_id: $stage_id
      backlog_id: $backlog_id
      sprint_id: $sprint_id
      status: $status
    ) {
      id
      title
      description
      due_date
      priority
      estimate
      status
      stage_id
      backlog_id
      sprint_id
      project_id
      team_id
      position
      assignee_id
      assignee {
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
        board_id
      }
      sprint {
        id
        name
        start_date
        end_date
      }
      created_at
      updated_at
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
      project_id
      team_id
      stage_id
      backlog_id
      sprint_id
      position
      status
      assignee_id
      assignee {
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
        board_id
      }
    }
  }
`;

export const REORDER_TASKS = gql`
  mutation ReorderTasks($stage_id: ID!, $task_ids: [ID!]!) {
    reorderTasks(stage_id: $stage_id, task_ids: $task_ids)
  }
`;

export const REORDER_BACKLOG_TASKS = gql`
  mutation ReorderBacklogTasks($project_id: ID!, $team_id: ID!, $backlog_id: ID, $task_ids: [ID!]!) {
    reorderBacklogTasks(
      project_id: $project_id
      team_id: $team_id
      backlog_id: $backlog_id
      task_ids: $task_ids
    )
  }
`;

export const SET_TASK_ASSIGNEE = gql`
  mutation SetTaskAssignee($task_id: ID!, $member_id: ID) {
    setTaskAssignee(task_id: $task_id, member_id: $member_id) {
      ...TaskModalTaskFields
    }
  }
  ${TASK_FRAGMENT}
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
