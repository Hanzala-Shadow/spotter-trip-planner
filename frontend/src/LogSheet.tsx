import type { DailyLog, DriverDetails, Status } from './types';
import { exactTime, dateLabel, kindLabel, offsetLabel } from './format';

const statuses: Status[] = ['off_duty', 'sleeper', 'driving', 'on_duty'];
const labels = ['1. Off duty', '2. Sleeper berth', '3. Driving', '4. On duty'];
export default function LogSheet({
  log,
  details,
  offset,
  from,
  to,
}: {
  log: DailyLog;
  details: DriverDetails;
  offset: number;
  from: string;
  to: string;
}) {
  const x = (second: number) => 128 + (second / 86400) * 792;
  const y = (status: Status) => 62 + statuses.indexOf(status) * 38;
  const points = log.segments
    .flatMap((s) => [`${x(s.start_second)},${y(s.status)}`, `${x(s.end_second)},${y(s.status)}`])
    .join(' ');
  const value = (text: string) => text || 'Not provided';
  return (
    <article className="log-sheet" aria-label={`Daily log for ${log.date}`}>
      <div className="log-heading">
        <div>
          <span className="eyebrow">RECORD OF DUTY STATUS</span>
          <h3>Driver’s daily log</h3>
          <p>Planned schedule · One calendar day · {offsetLabel(offset)}</p>
        </div>
        <div className="log-date">
          {dateLabel(log.date)}
          <small>{log.date.slice(0, 4)}</small>
        </div>
      </div>
      <div className="log-fields">
        <div>
          <span>Driver</span>
          <strong>{value(details.driver)}</strong>
        </div>
        <div>
          <span>Carrier</span>
          <strong>{value(details.carrier)}</strong>
        </div>
        <div>
          <span>Vehicle / trailer</span>
          <strong>{value(details.vehicle)}</strong>
        </div>
        <div>
          <span>Trip from</span>
          <strong>{from}</strong>
        </div>
        <div>
          <span>Trip to</span>
          <strong>{to}</strong>
        </div>
        <div>
          <span>Miles this day</span>
          <strong>{log.miles.toFixed(1)} mi</strong>
        </div>
      </div>
      <div className="log-graph-scroll">
        <svg
          className="log-graph"
          viewBox="0 0 1000 236"
          role="img"
          aria-label={`Four-status 24-hour duty graph for ${log.date}`}
        >
          <title>Driver duty graph with 15-minute ticks and connected duty changes</title>
          <rect x="128" y="42" width="792" height="152" fill="#fff" stroke="#8c9d9d" />
          {Array.from({ length: 25 }, (_, h) => (
            <g key={h}>
              <line
                x1={x(h * 3600)}
                x2={x(h * 3600)}
                y1="42"
                y2="194"
                stroke={h % 6 === 0 ? '#7c9090' : '#cbd4d4'}
                strokeWidth={h % 6 === 0 ? 1.2 : 0.7}
              />
              <text x={x(h * 3600)} y="27" textAnchor="middle" fontSize="12" fill="#536463">
                {h === 0 || h === 24 ? 'Mid' : h === 12 ? 'Noon' : h % 12}
              </text>
            </g>
          ))}
          {statuses.map((status, row) => (
            <g key={status}>
              <text x="6" y={y(status) + 4} fontSize="14" fill="#213b39">
                {labels[row]}
              </text>
              <text x="6" y={y(status) + 18} fontSize="10" fill="#536463">
                {row === 3 ? '(not driving)' : ''}
              </text>
              <line x1="128" x2="920" y1={42 + row * 38} y2={42 + row * 38} stroke="#bccaca" />
              {Array.from(
                { length: 96 },
                (_, i) =>
                  i % 4 !== 0 && (
                    <line
                      key={i}
                      x1={x(i * 900)}
                      x2={x(i * 900)}
                      y1={42 + row * 38}
                      y2={42 + row * 38 + (i % 2 === 0 ? 12 : 7)}
                      stroke="#c3cece"
                      strokeWidth=".7"
                    />
                  ),
              )}
              <text x="960" y={y(status) + 4} textAnchor="middle" fontSize="13" fill="#213b39">
                {exactTime(log.totals[status])}
              </text>
            </g>
          ))}
          <text x="960" y="27" textAnchor="middle" fontSize="11" fill="#536463">
            HOURS
          </text>
          <polyline
            points={points}
            fill="none"
            stroke="#11665c"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <text x="128" y="220" fontSize="11" fill="#536463">
            15-minute grid · Exact event times used for calculations
          </text>
          <text x="960" y="220" fontSize="13" textAnchor="middle" fontWeight="700">
            24:00
          </text>
        </svg>
      </div>
      <div className="remarks-title">
        Remarks <span>Home-terminal time</span>
      </div>
      <table className="remarks">
        <thead>
          <tr>
            <th>Time</th>
            <th>Activity</th>
            <th>Location and remarks</th>
          </tr>
        </thead>
        <tbody>
          {log.remarks.map((remark, i) => (
            <tr key={i}>
              <td>{remark.time}</td>
              <td>{kindLabel[remark.kind]}</td>
              <td>
                <strong>{remark.location}</strong>
                <span>{remark.reason}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="log-footer">
        <span>Shipping document: {value(details.shipping)}</span>
        <span>Office / terminal: {value(details.office)}</span>
      </div>
      <div className="log-certification">
        <span>Driver signature: __________________________</span>
        <small>
          Planning worksheet. Review actual duty times and locations before certifying a driving
          record.
        </small>
      </div>
    </article>
  );
}
