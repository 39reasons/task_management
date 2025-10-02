import { gql } from "@apollo/client";

export const GET_WORKFLOWS = gql`
  query GetWorkflows($project_id: ID!) {
    workflows(project_id: $project_id) {
      id
      name
      project_id
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
          stage_id
          project_id
          assigned_to
          position
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
          stage_id
          project_id
          assigned_to
          position
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
