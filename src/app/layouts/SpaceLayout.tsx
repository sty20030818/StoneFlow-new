import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import {
  selectCurrentSpaceId,
  useSpaceShellStore,
} from '../../features/space/model/useSpaceShellStore'
import { AppFrame } from '../../shared/ui/AppFrame'

export function SpaceLayout() {
  const { spaceId = 'default' } = useParams()
  const currentSpaceId = useSpaceShellStore(selectCurrentSpaceId)

  useEffect(() => {
    if (currentSpaceId !== spaceId) {
      useSpaceShellStore.setState({ currentSpaceId: spaceId })
    }
  }, [currentSpaceId, spaceId])

  return (
    <AppFrame currentSpaceId={spaceId}>
      <Outlet />
    </AppFrame>
  )
}
