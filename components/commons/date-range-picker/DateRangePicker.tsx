import React from 'react'
import './styles.css'
import moment, { min } from 'moment'

type Props = {
    onApply: (start: string, end: string) => void;
    onReset: () => void;
    start: string;
    end: string;
    setStart: (start: string) => void;
    setEnd: (end: string) => void;
}
const DateRangePicker = ({ onApply, onReset, start, end, setStart, setEnd }: Props) => {
    const [minDate, setMinDate] = React.useState(moment('07-2025').format('YYYY-MM-DD'))
    const [maxDate, setMaxDate] = React.useState(moment().format('YYYY-MM-DD'))
    return (
        <div className="hd-date-group">
            <label>
                Desde
                <input
                    type="date"
                    max={end}
                    min={minDate}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                />
            </label>
            <label>
                Hasta
                <input
                    type="date"
                    min={start}
                    max={maxDate}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                />
            </label>
            <button onClick={() => onApply(start, end)}>Aplicar</button>
            <button onClick={() => onReset()}>Restablecer</button>
        </div>
    )
}

export default DateRangePicker
