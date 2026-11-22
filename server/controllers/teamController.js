import {
  getAllUsers,
  findUserById,
  updateUserStatus,
  addAuditEvent
} from '../services/dataAccess.js';

export async function getTeam(_req, res) {
  const team = await getAllUsers();
  res.json(team);
}

export async function updateTeamMemberStatus(req, res) {
  const targetUser = await findUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ message: 'Team member not found.' });

  if (targetUser.id === req.user.id && req.body.active === false) {
    return res.status(400).json({ message: 'You cannot suspend your own account.' });
  }

  const updated = await updateUserStatus(targetUser.id, Boolean(req.body.active));
  await addAuditEvent('user.status_changed', 'user', targetUser.id, { active: updated.active }, req.user.id);

  res.json(updated);
}
