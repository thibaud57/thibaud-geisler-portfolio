import "server-only"
import { BlockList, isIP } from "node:net"

// Plages non routables sur Internet : réseau privé, la machine elle-même, métadonnées du VPS (169.254.169.254), partage opérateur, documentation, multicast, réservées.
const BLOCKED_IPV4: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]

// NAT64 (64:ff9b::/96 et 64:ff9b:1::/48), 6to4 (2002::/16), Teredo (2001::/32) et la forme IPv4-compatible (::/96) portent une IPv4 que BlockList ne déballe pas : refusés en bloc, aucun site ne s'y publie.
const BLOCKED_IPV6: readonly (readonly [string, number])[] = [
  ["::", 128],
  ["::1", 128],
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
]

const BLOCK_LIST = new BlockList()
for (const [network, prefix] of BLOCKED_IPV4) BLOCK_LIST.addSubnet(network, prefix, "ipv4")
for (const [network, prefix] of BLOCKED_IPV6) BLOCK_LIST.addSubnet(network, prefix, "ipv6")

// BlockList applique ses plages IPv4 à une IPv6 qui en porte une (::ffff:10.0.0.1) ; le test « embedded » le revérifie à chaque montée de Node.
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true
  return BLOCK_LIST.check(address, family === 4 ? "ipv4" : "ipv6")
}
