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

export const GET_COMMENTS = gql`
  query GetComments($task_id: ID!) {
    task(id: $task_id) {
      id
      comments {
        id
        content
        created_at
        user {
          id
          username
          name
        }
      }
    }
  }
`;

export const ADD_COMMENT = gql`
  mutation AddComment($task_id: ID!, $content: String!) {
    addComment(task_id: $task_id, content: $content) {
      id
      content
      created_at
      user {
        id
        username
        name
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

export const GET_PROJECT_TAGS = gql`
  query GetProjectTags($project_id: ID!) {
    tags(project_id: $project_id) {
      id
      name
      color
    }
  }
`;

export const GET_TASK_TAGS = gql`
  query GetTaskTags($task_id: ID!) {
    task(id: $task_id) {
      id
      title
      tags {
        id
        name
        color
      }
    }
  }
`;

export const ADD_TAG = gql`
  mutation AddTag($project_id: ID!, $name: String!, $color: String) {
    addTag(project_id: $project_id, name: $name, color: $color) {
      id
      name
      color
    }
  }
`;

export const ADD_TAG_TO_TASK = gql`
  mutation AddTagToTask($task_id: ID!, $name: String!, $color: String) {
    addTagToTask(task_id: $task_id, name: $name, color: $color) {
      id
      title
      tags {
        id
        name
        color
      }
    }
  }
`;

export const ASSIGN_TAG_TO_TASK = gql`
  mutation AssignTagToTask($task_id: ID!, $tag_id: ID!) {
    assignTagToTask(task_id: $task_id, tag_id: $tag_id) {
      id
      title
      tags {
        id
        name
        color
      }
    }
  }
`;

export const REMOVE_TAG_FROM_TASK = gql`
  mutation RemoveTagFromTask($task_id: ID!, $tag_id: ID!) {
    removeTagFromTask(task_id: $task_id, tag_id: $tag_id) {
      id
      title
      tags {
        id
        name
        color
      }
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      is_public
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
    }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($name: String!, $username: String!, $password: String!) {
    signUp(name: $name, username: $username, password: $password) {
      token
      user {
        id
        name
        username
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        name
        username
      }
    }
  }
`;
