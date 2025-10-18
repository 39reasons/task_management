import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      is_public
      viewer_role
      viewer_is_owner
      position
      created_at
      updated_at
      teams {
        id
        project_id
        name
        slug
        role
        backlogs {
          id
          name
          description
          position
          created_at
          updated_at
        }
        sprints {
          id
          name
          goal
          start_date
          end_date
          created_at
          updated_at
          team_id
        }
      }
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      is_public
      viewer_role
      viewer_is_owner
      created_at
      updated_at
      position
      created_by
      teams {
        id
        project_id
        name
        slug
        role
        description
        created_at
        members {
          role
          status
          user {
            id
            first_name
            last_name
            username
            avatar_color
          }
        }
      }
      members {
        id
        first_name
        last_name
        username
        avatar_color
      }
      boards {
        id
        name
        team_id
        workflow_type
        stages {
          id
          name
          position
          board_id
          tasks {
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
            sprint {
              id
              name
              start_date
              end_date
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
  mutation AddProject($name: String!, $description: String, $is_public: Boolean) {
    addProject(name: $name, description: $description, is_public: $is_public) {
      id
      name
      description
      is_public
      viewer_role
      viewer_is_owner
      position
      created_at
      updated_at
      teams {
        id
        project_id
        name
        slug
        role
      }
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
      viewer_role
      viewer_is_owner
      position
      created_at
      updated_at
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const REORDER_PROJECTS = gql`
  mutation ReorderProjects($project_ids: [ID!]!) {
    reorderProjects(project_ids: $project_ids)
  }
`;

export const LEAVE_PROJECT = gql`
  mutation LeaveProject($project_id: ID!) {
    leaveProject(project_id: $project_id)
  }
`;

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($project_id: ID!, $user_id: ID!) {
    removeProjectMember(project_id: $project_id, user_id: $user_id)
  }
`;

export const GET_PROJECTS_OVERVIEW = gql`
  query GetProjectsOverview {
    projects {
      id
      name
      description
      is_public
      viewer_role
      viewer_is_owner
      position
      created_at
      updated_at
      teams {
        id
        project_id
        name
        slug
        role
      }
    }
  }
`;
