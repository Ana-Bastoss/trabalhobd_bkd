import React, { useState } from 'react';

const StarRating = () => {
    // Guarda a nota selecionada pelo usuário (de 0 a 5)
    const [rating, setRating] = useState(0);

    return (
        <div className="star-rating-input" style={{ fontSize: '1.5rem', marginBottom: '15px', cursor: 'pointer' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <i
                    key={star}
                    className={star <= rating ? "fas fa-star" : "far fa-star"}
                    style={{ color: star <= rating ? '#f39c12' : '#ccc', marginRight: '5px' }}
                    onClick={() => setRating(star)}
                ></i>
            ))}
        </div>
    );
};

export default StarRating;