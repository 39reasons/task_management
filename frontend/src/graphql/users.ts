import { gql } from "@apollo/client";

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
