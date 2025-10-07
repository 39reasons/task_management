import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      is_public
      viewer_is_owner
    }
  }
`;

export const ADD_PROJECT = gql`
  mutation AddProject($name: String!, $description: String, $is_public: Boolean) {
    addProject(name: $name, description: $description, is_public: $is_public) {
      id
      name
      description
      is_public
      viewer_is_owner
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $name: String, $description: String, $is_public: Boolean) {
    updateProject(id: $id, name: $name, description: $description, is_public: $is_public) {
      id
      name
      description
      is_public
      viewer_is_owner
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const GET_PROJECTS_OVERVIEW = gql`
  query GetProjectsOverview {
    projects {
      id
      name
      description
      is_public
      created_at
      updated_at
      viewer_is_owner
      members {
        id
        first_name
        last_name
        username
        avatar_color
      }
      workflows {
        id
        name
        stages {
          id
          name
          position
          tasks {
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
            tags {
              id
              name
              color
            }
          }
        }
      }
    }
  }
`;
