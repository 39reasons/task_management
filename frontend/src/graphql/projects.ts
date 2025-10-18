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
      boards {
        id
        name
        workflow_type
        stages {
          id
          name
          position
          board_id
          tasks {
            id
            title
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

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      team_id
      name
      description
      is_public
      viewer_is_owner
      viewer_role
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
      boards {
        id
        name
        workflow_type
        stages {
          id
          name
          position
          board_id
          tasks {
            id
            title
            due_date
            priority
            estimate
            status
            stage_id
            backlog_id
            sprint_id
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
          }
        }
      }
      backlogs {
        id
        team_id
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
      boards {
        id
        name
        workflow_type
        stages {
          id
          name
          position
          board_id
          tasks {
            id
            title
            due_date
            priority
            estimate
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
            sprint {
              id
              name
              start_date
              end_date
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
      boards {
        id
        name
        workflow_type
        stages {
          id
          name
          position
          board_id
          tasks {
            id
            title
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

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($project_id: ID!, $user_id: ID!) {
    removeProjectMember(project_id: $project_id, user_id: $user_id)
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
      boards {
        id
        name
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
  }
`;
