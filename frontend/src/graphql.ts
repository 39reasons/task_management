import { gql } from "@apollo/client";

export const GET_TASKS = gql`
  query {
    tasks {
      id
      title
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
      description
      dueDate
      priority
      status
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const UPDATE_TASK_PRIORITY = gql`
  mutation UpdateTaskPriority($id: ID!, $priority: String!) {
    updateTaskPriority(id: $id, priority: $priority) {
      id
      priority
    }
  }
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: ID!, $status: String!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;