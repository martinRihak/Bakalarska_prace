import React from "react";
import api from '@services/apiService';
import '@css/UserBar.css'

const UserBar = () => {
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await api.getUser();
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            }
        };
        fetchUser();
    }, []);

    if (!user) {
        return <div className="main-userBar">Loading...</div>;
    }

    return (
        <>
            <div className="main-userBar">
                <div className="userName">
                    <p color="black">{user.name}</p>
                </div>
            </div>
        </>
    );
};
export default UserBar;