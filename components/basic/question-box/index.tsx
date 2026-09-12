'use client';
import React from 'react';

type QuestionBoxProps = {
  title: React.ReactNode;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  message: { type: 'success' | 'error'; question: 1 | 2 | 3 } | null;
  loading: boolean;
  questionId: 1 | 2 | 3;
  edad: string;
  setEdad: (edad: string) => void;
}

const QuestionBox: React.FC<QuestionBoxProps> = ({
  title,
  value,
  onChange,
  onSubmit,
  textareaRef,
  message,
  loading,
  questionId,
  edad,
  setEdad,
}) => {
  return (
    <div className="q-item w100 gap">
      {title}
      <div className="q-input-p1" />
      <div className="w100 q-input-response">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            const el = textareaRef.current;
            if (el) {
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }
            onChange(e);
          }}
          className={message && message.question === questionId && message.type === 'error'
            ? 'q-input q-input-error'
            : 'q-input'}
          placeholder="Escribe el mensaje aquí..."
        />
        {message && message.question === questionId && message.type === 'success' && (
          <div className="q-success-msg">Mensaje enviado</div>
        )}
        {message && message.question === questionId && message.type === 'error' && (
          <div className="q-error-msg">Se produjo un error. Por favor, vuelve enviar el mensaje.</div>
        )}
        <div className="mt8">
          <select
            id="edad-select"
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            className="q-dropdown"
          >
            <option value="" disabled hidden>EDAD</option>
            <option value="15-">15-</option>
            <option value="16-29">16-29</option>
            <option value="30-45">30-45</option>
            <option value="46+">46 a más</option>
          </select>
        </div>
        {value && (
          <button
            disabled={loading || !edad}
            onClick={onSubmit}
            className={`talk-save-button pointer thunder-fw-bold-lc uppercase ${loading || !edad ? 'disabled' : ''}`}
          >
            Enviar mensaje
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionBox;
