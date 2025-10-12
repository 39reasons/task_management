import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query GetProjects($team_id: ID!) {
    projects(team_id: $team_id) {
      id
      team_id
      name
      description
      is_public
      viewer_is_owner
      viewer_role
      position
      created_at
      updated_at
      team {
        id
        name
        slug
      }
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
            due_date
            priority
            stage_id
            project_id
            team_id
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

export const ADD_PROJECT = gql`
  mutation AddProject(
    $team_id: ID!
    $name: String!
    $description: String
    $is_public: Boolean
  ) {
    addProject(
      team_id: $team_id
      name: $name
      description: $description
      is_public: $is_public
    ) {
      id
      team_id
      name
      description
      is_public
      viewer_is_owner
      viewer_role
      position
      created_at
      updated_at
      team {
        id
        name
        slug
      }
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
            due_date
            priority
            stage_id
            project_id
            team_id
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

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $name: String, $description: String, $is_public: Boolean) {
    updateProject(id: $id, name: $name, description: $description, is_public: $is_public) {
      id
      team_id
      name
      description
      is_public
      viewer_is_owner
      viewer_role
      position
      created_at
      updated_at
      team {
        id
        name
        slug
      }
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
            due_date
            priority
            stage_id
            project_id
            team_id
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

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;
export const REORDER_PROJECTS = gql`
  mutation ReorderProjects($team_id: ID!, $project_ids: [ID!]!) {
    reorderProjects(team_id: $team_id, project_ids: $project_ids)
  }
`;

export const LEAVE_PROJECT = gql`
  mutation LeaveProject($project_id: ID!) {
    leaveProject(project_id: $project_id)
  }
`;

export const GET_PROJECTS_OVERVIEW = gql`
  query GetProjectsOverview($team_id: ID!) {
    projects(team_id: $team_id) {
      id
      team_id
      name
      description
      is_public
      created_at
      updated_at
      viewer_is_owner
      viewer_role
      position
      team {
        id
        name
        slug
      }
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
            team_id
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
