import { gql } from "@apollo/client";

export const GET_PROJECT_MEMBERS = gql`
  query GetProjectMembers($project_id: ID!) {
    projectMembers(project_id: $project_id) {
      id
      name
      username
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      username
    }
  }
`;
