import { gql } from "@apollo/client";

export const SIGN_UP = gql`
  mutation SignUp($first_name: String!, $last_name: String!, $username: String!, $password: String!) {
    signUp(first_name: $first_name, last_name: $last_name, username: $username, password: $password) {
      token
      user {
        id
        first_name
        last_name
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
        first_name
        last_name
        username
      }
    }
  }
`;
