import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
const useApi = () => {
  const navigate = useNavigate();

  const callApi = useCallback(
    async (apiFunction) => {
      try {
        return await apiFunction();
      } catch (error) {
        if (
          error.message === "Server není dostupný" ||
          error.message === "server-error"
        ) {
          navigate("/server-error");
        } else {
          throw error;
        }
      }
    },

    [navigate]
  );

  return { callApi };
};

export default useApi;
