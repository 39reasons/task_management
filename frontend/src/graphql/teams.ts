import { gql } from "@apollo/client";

export const GET_TEAMS = gql`
  query GetTeams {
    teams {
      id
      name
      description
      slug
      role
      created_at
      updated_at
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($name: String!, $description: String) {
    createTeam(name: $name, description: $description) {
      id
      name
      description
      slug
      role
      created_at
      updated_at
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation UpdateTeam($id: ID!, $name: String, $description: String) {
    updateTeam(id: $id, name: $name, description: $description) {
      id
      name
      description
      slug
      role
      created_at
      updated_at
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation DeleteTeam($id: ID!) {
    deleteTeam(id: $id)
  }
`;
