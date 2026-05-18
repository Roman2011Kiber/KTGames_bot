import { h } from '../lib/dom.js';
import { ROLE_LABEL, ROLE_ICON } from '../lib/roles.js';

export function RoleBadge(player) {
  return h('div.text-right.text-xs', {}, [
    h('div.uppercase.tracking-widest.muted', {}, 'Ваша роль'),
    h('div.font-display.text-base.accent', {}, `${ROLE_ICON[player.role] || ''} ${ROLE_LABEL[player.role] || ''}`),
  ]);
}
