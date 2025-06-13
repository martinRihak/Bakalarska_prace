import { useNavigate } from 'react-router-dom';

const useApi = () => {
  const navigate = useNavigate();

  const callApi = async (apiFunction) => {
    try {
      return await apiFunction();
    } catch (error) {
      if (error.message === "Server není dostupný") {
        navigate('/server-error');
      } else {
        throw error;
      }
    }
  };

  return { callApi };
};

export default useApi;