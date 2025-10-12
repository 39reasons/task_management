import { gql } from "@apollo/client";

export const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    notifications {
      id
      message
      type
      status
      is_read
      recipient_id
      created_at
      project {
        id
        name
        team_id
      }
      sender {
        id
        first_name
        last_name
        username
        avatar_color
      }
    }
  }
`;

export const SEND_PROJECT_INVITE = gql`
  mutation SendProjectInvite($project_id: ID!, $username: String!) {
    sendProjectInvite(project_id: $project_id, username: $username) {
      id
      status
    }
  }
`;

export const RESPOND_NOTIFICATION = gql`
  mutation RespondToNotification($id: ID!, $accept: Boolean!) {
    respondToNotification(id: $id, accept: $accept) {
      id
      status
      is_read
      project {
        id
        name
        team_id
      }
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!, $read: Boolean) {
    markNotificationRead(id: $id, read: $read) {
      id
      is_read
    }
  }
`;


export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id)
  }
`;

export const NOTIFICATION_EVENTS = gql`
  subscription NotificationEvents($recipient_id: ID!) {
    notificationEvents(recipient_id: $recipient_id) {
      action
      notification_id
      notification {
        id
        message
        type
        status
        is_read
        recipient_id
        created_at
        project {
          id
          name
          team_id
        }
        sender {
          id
          first_name
          last_name
          username
          avatar_color
        }
      }
    }
  }
`;
