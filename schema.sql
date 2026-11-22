--
-- PostgreSQL database dump
--

\restrict ykd9O5wpce0vsghfM2JflcgHmk9kBvirRcZJQF2ns1eNGExiy29il2qrfKF6XEQ

-- Dumped from database version 18.7 (84da7d8)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: anonymous_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anonymous_users (
    user_id uuid NOT NULL,
    username character varying(8) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.anonymous_users ALTER COLUMN user_id SET (pg_attver=28926648);
ALTER TABLE ONLY public.anonymous_users ALTER COLUMN username SET (pg_attver=28926648);
ALTER TABLE ONLY public.anonymous_users ALTER COLUMN created_at SET (pg_attver=28926648);


--
-- Name: room_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_list (
    room_id bigint NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_private boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY public.room_list ALTER COLUMN room_id SET (pg_attver=28934712);
ALTER TABLE ONLY public.room_list ALTER COLUMN name SET (pg_attver=28934712);
ALTER TABLE ONLY public.room_list ALTER COLUMN description SET (pg_attver=28934712);
ALTER TABLE ONLY public.room_list ALTER COLUMN is_private SET (pg_attver=28934712);


--
-- Name: room_list_room_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.room_list ALTER COLUMN room_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.room_list_room_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_members (
    user_id character varying(128) NOT NULL,
    room_id bigint NOT NULL,
    is_moderator boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY public.room_members ALTER COLUMN user_id SET (pg_attver=28955168);
ALTER TABLE ONLY public.room_members ALTER COLUMN room_id SET (pg_attver=28955168);
ALTER TABLE ONLY public.room_members ALTER COLUMN is_moderator SET (pg_attver=28955168);


--
-- Name: anonymous_users anonymous_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_users
    ADD CONSTRAINT anonymous_users_pkey PRIMARY KEY (user_id);


--
-- Name: anonymous_users anonymous_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_users
    ADD CONSTRAINT anonymous_users_username_key UNIQUE (username);


--
-- Name: room_list room_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_list
    ADD CONSTRAINT room_list_pkey PRIMARY KEY (room_id);


--
-- Name: room_members room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_pkey PRIMARY KEY (room_id, user_id);


--
-- Name: idx_room_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_members_user_id ON public.room_members USING btree (user_id);


--
-- Name: room_members room_members_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room_list(room_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ykd9O5wpce0vsghfM2JflcgHmk9kBvirRcZJQF2ns1eNGExiy29il2qrfKF6XEQ

