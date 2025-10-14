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
