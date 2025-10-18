import { gql } from "@apollo/client";

export const GET_TEAMS = gql`
  query GetTeams {
    teams {
      id
      project_id
      name
      description
      slug
      role
      created_at
      updated_at
      project {
        id
        name
        description
        is_public
      }
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
  }
`;

export const GET_TEAM = gql`
  query GetTeam($id: ID!) {
    team(id: $id) {
      id
      project_id
      name
      description
      slug
      role
      created_at
      updated_at
      project {
        id
        name
        description
        is_public
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
        }
      }
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
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($project_id: ID!, $name: String!, $description: String) {
    createTeam(project_id: $project_id, name: $name, description: $description) {
      id
      project_id
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
      project_id
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

export const LEAVE_TEAM = gql`
  mutation LeaveTeam($team_id: ID!) {
    leaveTeam(team_id: $team_id)
  }
`;

export const REMOVE_TEAM_MEMBER = gql`
  mutation RemoveTeamMember($team_id: ID!, $user_id: ID!) {
    removeTeamMember(team_id: $team_id, user_id: $user_id)
  }
`;
