import { gql } from "@apollo/client";

export const GET_TASKS = gql`
  query GetTasks($project_id: ID) {
    tasks(project_id: $project_id) {
      id
      title
      description
      due_date
      priority
      status
      project_id
      assigned_to
      tags {
        id
        name
        color
      }
    }
  }
`;

export const ADD_TASK = gql`
  mutation AddTask($project_id: ID!, $title: String!, $status: String!) {
    addTask(project_id: $project_id, title: $title, status: $status) {
      id
      title
      description
      due_date
      priority
      status
      project_id
      assigned_to
      tags {
        id
        name
        color
      }
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
    $due_date: String
    $priority: String
    $status: String
    $assigned_to: ID
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      due_date: $due_date
      priority: $priority
      status: $status
      assigned_to: $assigned_to
    ) {
      id
      title
      description
      due_date
      priority
      status
      assigned_to
      project_id
      tags {
        id
        name
        color
      }
    }
  }
`;