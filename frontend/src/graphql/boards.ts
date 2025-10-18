import { gql } from "@apollo/client";

export const GET_BOARDS = gql`
  query GetBoards($project_id: ID!) {
    boards(project_id: $project_id) {
      id
      name
      project_id
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
`;

export const GET_BOARD = gql`
  query GetBoard($id: ID!) {
    board(id: $id) {
      id
      name
      project_id
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
`;

export const GET_BOARD_WORKFLOW_TYPES = gql`
  query GetBoardWorkflowTypes {
    boardWorkflowTypes
  }
`;

export const UPDATE_BOARD = gql`
  mutation UpdateBoard($id: ID!, $name: String, $workflow_type: BoardWorkflowType) {
    updateBoard(id: $id, name: $name, workflow_type: $workflow_type) {
      id
      name
      workflow_type
    }
  }
`;

export const ADD_STAGE = gql`
  mutation AddStage($board_id: ID!, $name: String!, $position: Int) {
    addStage(board_id: $board_id, name: $name, position: $position) {
      id
      name
      position
      board_id
    }
  }
`;

export const UPDATE_STAGE = gql`
  mutation UpdateStage($id: ID!, $name: String, $position: Int) {
    updateStage(id: $id, name: $name, position: $position) {
      id
      name
      position
      board_id
    }
  }
`;

export const DELETE_STAGE = gql`
  mutation DeleteStage($id: ID!) {
    deleteStage(id: $id)
  }
`;

export const REORDER_STAGES = gql`
  mutation ReorderStages($board_id: ID!, $stage_ids: [ID!]!) {
    reorderStages(board_id: $board_id, stage_ids: $stage_ids)
  }
`;

export const GENERATE_BOARD_STAGES = gql`
  mutation GenerateBoardStages($input: GenerateBoardStagesInput!) {
    generateBoardStages(input: $input) {
      id
      name
      position
      board_id
    }
  }
`;

export const TASK_BOARD_EVENTS = gql`
  subscription TaskBoardEvents($project_id: ID!) {
    taskBoardEvents(project_id: $project_id) {
      action
      project_id
      team_id
      board_id
      stage_id
      previous_stage_id
      task_id
      task_ids
      stage_ids
      origin
      timestamp
    }
  }
`;
