import Header from "./../../components/Header/Header";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../modules/Apis";


export default function Home() {

    const [showForm, setShowForm] = useState(false)
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        checkUser();
    }, [])

    
    useEffect(() => {
        if (!showForm) return

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeForm()
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [showForm])


    function closeForm() {
        setShowForm(false)
        setLoading(false)
    }


    async function createUser(e: React.FormEvent<HTMLFormElement>) {

        e.preventDefault()

        if (loading) return
        setLoading(true)

        try {
            const response = await api.get("Users/create-temp-session", {
                params: { username: username.trim() },
            })

            if(response.status === 200){
                navigate("/room")
            }

        } catch (error) {
            // check the error
        } finally {
            setLoading(false)
        }
    }

    async function checkUser() {

        try {
            const response = await api.get("Users/check-temp-session")

            if (response.status == 200) {
                navigate('/room')
            }
        } catch (error) {
            // check the error
        }
    }


    return (
        <div className="home-page">
            <Header />

            <main className="home-main">
                <section className="home-content">
                    <p className="home-intro">
                        Anoyt is a place to communicate without making your
                        identity the center of the conversation. Join a room,
                        talk to others, and leave when you are done. There is
                        no need to build a profile or explain who you are.
                    </p>

                    <button
                        className="home-start-button"
                        type="button"
                        onClick={() => setShowForm(true)}
                    >
                        Get Started
                    </button>

                    <p className="home-guide">
                        Keep in mind that anonymity does not make information
                        private. Do not share passwords, addresses, phone
                        numbers, financial information, personal documents, or
                        anything else you would not want a stranger to know.
                        Treat every conversation as a conversation with
                        someone you do not know, and share only what you are
                        comfortable making public.
                    </p>
                </section>
            </main>

            {showForm && (
                <div className="modal-overlay" onClick={closeForm}>
                    <form
                        className="username-form"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={createUser}
                    >
                        <button
                            className="username-close"
                            type="button"
                            aria-label="Close"
                            onClick={closeForm}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>

                        <label className="username-label" htmlFor="username">
                            Choose a username
                        </label>

                        <input
                            id="username"
                            className="username-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={20}
                            placeholder="Leave empty for a random one"
                            autoComplete="off"
                            autoFocus
                        />

                        <p className="username-note">
                            We do not recommend using your real name. If you
                            leave this empty, we will give you a random 8
                            character username.
                        </p>

                        <button
                            className="username-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Please wait..." : "Continue"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}