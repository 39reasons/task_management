import { gql } from "@apollo/client";

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
          first_name
          last_name
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
        first_name
        last_name
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;
