import "./RoomCard.css"
import { useNavigate } from "react-router-dom";
import { useState } from "react";


export interface RoomCardProps {
  name: string;
  description: string;
  room_id: string;
  is_private: boolean;
  members?: number;
}


function RoomCard({ name, description, room_id, members }: RoomCardProps) {

  const navigate = useNavigate()

  const [open ,setOpen] = useState(false)

  const connectToRoom = () => {
    navigate(`/room/${room_id}`, {state: {roomName: name}})
  };

  return (
    <article className="room-card">
      <div className="room-card__header">
        <h3>{name}</h3>

        <div className="room-card__meta">
          <span className="room-card__members">{members} online</span>

          <div className="room-card__menu">
            <button
              className="room-card__menu-btn"
              aria-label="Room options"
              onClick={()=>{setOpen(o=>!o)}}
            >
              ⋮
            </button>

            {open &&(<div className="room-card__popup">
              <button className="room-card__popup-item">Sample button</button>
              <button className="room-card__popup-item">Sample button</button>
              <button className="room-card__popup-item">Sample button</button>
              <button className="room-card__popup-item">Sample button</button>
            </div>)}

          </div>
        </div>
      </div>

      <p className="room-card__description">
        {description}
      </p>

      <button className="room-card__button"
        onClick={connectToRoom}>
        Enter room
      </button>
    </article>
  );
}

export default RoomCard;