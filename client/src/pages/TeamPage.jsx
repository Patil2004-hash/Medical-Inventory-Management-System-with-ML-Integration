import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { API } from '../utils/formatters';

export default function TeamPage({ currentUser, setNotice }) {
  const [team, setTeam] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  async function fetchTeam() {
    try {
      const { data } = await axios.get(`${API}/api/team`);
      setTeam(data);
    } catch {
      setNotice('Team access management data unavailable.');
    }
  }

  async function handleToggleMember(member) {
    if (member.id === currentUser?.id && member.active) {
      setNotice('You cannot suspend your own account.');
      return;
    }

    setUpdatingId(member.id);
    try {
      await axios.patch(`${API}/api/team/${member.id}/status`, { active: !member.active });
      setTeam((rows) => rows.map((row) => row.id === member.id ? { ...row, active: !row.active } : row));
      setNotice(`${member.name} is now ${member.active ? 'suspended' : 'active'}.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to update team account status.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="team-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2><Users size={18} /> Team Access & Role Control</h2>
            <p className="muted">Administrator controls for active pharmacy user accounts.</p>
          </div>
          <span className="pill">{team.length} accounts</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th>Governance Action</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id}>
                  <td>
                    <b>{member.name}</b>
                    {member.id === currentUser?.id && <small className="current-badge">(Your Account)</small>}
                  </td>
                  <td>{member.email}</td>
                  <td>
                    <span className="pill">
                      <ShieldCheck size={12} /> {member.role}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${member.active ? '' : 'critical'}`}>
                      {member.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={`secondary ${member.active ? 'danger-hover' : 'success-hover'}`}
                      disabled={updatingId === member.id || (member.id === currentUser?.id && member.active)}
                      onClick={() => handleToggleMember(member)}
                    >
                      {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      {updatingId === member.id ? 'Updating...' : member.active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!team.length && <p className="empty">No team records available.</p>}
        </div>
      </section>
    </div>
  );
}
