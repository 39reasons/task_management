import { gql } from "@apollo/client";

export const GET_TASKS = gql`
  query {
    tasks {
      id
      title
      completed
      description
      dueDate
      priority
      status
    }
  }
`;

export const ADD_TASK = gql`
  mutation AddTask(
    $title: String!
    $description: String
    $dueDate: String
    $priority: String
    $status: String
  ) {
    addTask(
      title: $title
      description: $description
      dueDate: $dueDate
      priority: $priority
      status: $status
    ) {
      id
      title
      completed
      description
      dueDate
      priority
      status
    }
  }
`;

export const TOGGLE_TASK = gql`
  mutation ToggleTask($id: ID!) {
    toggleTask(id: $id) {
      id
      completed
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;
