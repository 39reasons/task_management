import { gql } from "@apollo/client";

export const GET_PROJECT_MEMBERS = gql`
  query GetProjectMembers($project_id: ID!) {
    projectMembers(project_id: $project_id) {
      id
      first_name
      last_name
      username
      avatar_color
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      first_name
      last_name
      username
      avatar_color
    }
  }
`;

export const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      first_name
      last_name
      username
      avatar_color
    }
  }
`;

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($first_name: String, $last_name: String, $username: String, $avatar_color: String) {
    updateUserProfile(first_name: $first_name, last_name: $last_name, username: $username, avatar_color: $avatar_color) {
      id
      first_name
      last_name
      username
      avatar_color
    }
  }
`;
