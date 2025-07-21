import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

const API_BASE = import.meta.env.VITE_API_URL;

export function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // 1) hit your new logout endpoint so the server clears the cookie
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",   // send the jwt cookie so server can clear it
    });

    // 2) navigate back to login
    navigate("/login");
  };

  return (
    <Button variant="outline-primary" onClick={handleLogout}>
      Log out
    </Button>
  );
}