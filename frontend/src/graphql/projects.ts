import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query {
    projects {
      id
      name
    }
  }
`;

export const ADD_PROJECT = gql`
  mutation AddProject($name: String!, $description: String) {
    addProject(name: $name, description: $description) {
      id
      name
    }
  }
`;
