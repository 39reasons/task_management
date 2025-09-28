import { gql } from "@apollo/client";

export const GET_TASKS = gql`
  query GetTasks($projectId: ID) {
    tasks(projectId: $projectId) {
      id
      title
      description
      dueDate
      priority
      status
      projectId
    }
  }
`;


export const ADD_TASK = gql`
  mutation AddTask(
    $projectId: ID!
    $title: String!
    $description: String
    $dueDate: String
    $priority: String
    $status: String
  ) {
    addTask(
      projectId: $projectId
      title: $title
      description: $description
      dueDate: $dueDate
      priority: $priority
      status: $status
    ) {
      id
      title
      projectId
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


export const UPDATE_TASK = gql`
  mutation UpdateTask(
    $id: ID!
    $title: String
    $description: String
    $dueDate: String
    $priority: String
    $status: String
  ) {
    updateTask(
      id: $id
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
      projectId
    }
  }
`;
