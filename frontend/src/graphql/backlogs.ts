import { gql } from "@apollo/client";

export const ADD_BACKLOG = gql`
  mutation AddBacklog($team_id: ID!, $name: String!, $description: String, $position: Int) {
    addBacklog(team_id: $team_id, name: $name, description: $description, position: $position) {
      id
      team_id
      name
      description
      position
      created_at
      updated_at
    }
  }
`;

export const UPDATE_BACKLOG = gql`
  mutation UpdateBacklog($id: ID!, $name: String, $description: String, $position: Int) {
    updateBacklog(id: $id, name: $name, description: $description, position: $position) {
      id
      team_id
      name
      description
      position
      created_at
      updated_at
    }
  }
`;

export const DELETE_BACKLOG = gql`
  mutation DeleteBacklog($id: ID!) {
    deleteBacklog(id: $id)
  }
`;

export const ADD_BACKLOG_TASK = gql`
  mutation AddBacklogTask($backlog_id: ID!, $title: String!, $description: String, $status: String) {
    addBacklogTask(backlog_id: $backlog_id, title: $title, description: $description, status: $status) {
      id
      backlog_id
      title
      description
      status
      position
      created_at
      updated_at
    }
  }
`;

export const UPDATE_BACKLOG_TASK = gql`
  mutation UpdateBacklogTask($id: ID!, $title: String, $description: String, $status: String, $position: Int) {
    updateBacklogTask(id: $id, title: $title, description: $description, status: $status, position: $position) {
      id
      backlog_id
      title
      description
      status
      position
      created_at
      updated_at
    }
  }
`;

export const DELETE_BACKLOG_TASK = gql`
  mutation DeleteBacklogTask($id: ID!) {
    deleteBacklogTask(id: $id)
  }
`;
