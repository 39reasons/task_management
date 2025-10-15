import { gql } from "@apollo/client";

export const GET_WORKFLOWS = gql`
  query GetWorkflows($project_id: ID!) {
    workflows(project_id: $project_id) {
      id
      name
      project_id
      team_id
      stages {
        id
        name
        position
        workflow_id
        tasks {
          id
          title
          description
          due_date
          priority
          status
          stage_id
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
          tags {
            id
            name
            color
          }
        }
      }
    }
  }
`;

export const GET_WORKFLOW = gql`
  query GetWorkflow($id: ID!) {
    workflow(id: $id) {
      id
      name
      project_id
      team_id
      stages {
        id
        name
        position
        workflow_id
        tasks {
          id
          title
          description
          due_date
          priority
          status
          stage_id
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
          tags {
            id
            name
            color
          }
        }
      }
    }
  }
`;

export const ADD_STAGE = gql`
  mutation AddStage($workflow_id: ID!, $name: String!, $position: Int) {
    addStage(workflow_id: $workflow_id, name: $name, position: $position) {
      id
      name
      position
      workflow_id
    }
  }
`;

export const UPDATE_STAGE = gql`
  mutation UpdateStage($id: ID!, $name: String, $position: Int) {
    updateStage(id: $id, name: $name, position: $position) {
      id
      name
      position
      workflow_id
    }
  }
`;

export const DELETE_STAGE = gql`
  mutation DeleteStage($id: ID!) {
    deleteStage(id: $id)
  }
`;

export const REORDER_STAGES = gql`
  mutation ReorderStages($workflow_id: ID!, $stage_ids: [ID!]!) {
    reorderStages(workflow_id: $workflow_id, stage_ids: $stage_ids)
  }
`;

export const GENERATE_WORKFLOW_STAGES = gql`
  mutation GenerateWorkflowStages($input: GenerateWorkflowStagesInput!) {
    generateWorkflowStages(input: $input) {
      id
      name
      position
      workflow_id
    }
  }
`;

export const TASK_BOARD_EVENTS = gql`
  subscription TaskBoardEvents($project_id: ID!) {
    taskBoardEvents(project_id: $project_id) {
      action
      project_id
      team_id
      workflow_id
      stage_id
      previous_stage_id
      task_id
      task_ids
      stage_ids
      origin
      timestamp
    }
  }
`;
