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
      projects {
        id
        is_public
        created_at
        updated_at
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
      name
      description
      slug
      role
      created_at
      updated_at
      projects {
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
