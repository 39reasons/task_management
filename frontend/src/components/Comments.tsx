import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { GET_COMMENTS, ADD_COMMENT } from "../graphql.js";

function Comments({ taskId }: { taskId: string }) {
  const { data, loading } = useQuery(GET_COMMENTS, { variables: { taskId } });
  const [addComment] = useMutation(ADD_COMMENT, {
    refetchQueries: [{ query: GET_COMMENTS, variables: { taskId } }],
  });

  const [content, setContent] = useState("");

  if (loading) return <p>Loading...</p>;

  return (
    <div className="mt-4">
      <h3 className="font-semibold text-white">Comments</h3>
      <ul className="mt-2 space-y-2">
        {data?.task?.comments.map((c: any) => (
          <li key={c.id} className="bg-gray-800 p-2 rounded">
            <span className="text-sm text-gray-300">{c.content}</span>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addComment({ variables: { taskId, content } });
          setContent("");
        }}
        className="mt-2 flex gap-2"
      >
        <input
          type="text"
          className="flex-1 rounded p-2 bg-gray-700 text-white"
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="bg-blue-600 px-4 rounded text-white">Send</button>
      </form>
    </div>
  );
}
