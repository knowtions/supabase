import { MinusCircle, PauseCircle } from 'lucide-react'

import type { ProjectInfo } from 'data/projects/projects-query'
import type { OrgSubscription, ProjectAddon } from 'data/subscriptions/types'
import { PricingInformation } from 'shared-data'
import { Modal } from 'ui'
import { Admonition } from 'ui-patterns'
import { plans as subscriptionsPlans } from 'shared-data/plans'
import { useMemo } from 'react'

export interface DowngradeModalProps {
  visible: boolean
  subscription?: OrgSubscription
  onClose: () => void
  onConfirm: () => void
  projects: ProjectInfo[]
}

const ProjectDowngradeListItem = ({ projectAddon }: { projectAddon: ProjectAddon }) => {
  const needsRestart = projectAddon.addons.find((addon) => addon.type === 'compute_instance')

  /**
   * We do not include Log Drains and Advanced MFA Phone for the following reasons:
   * 1. These addons are not removed automatically. Instead, users have to remove the respective configuration themselves
   * 2. It's not obvious to users that Log Drains and MFA Phone are addons
   */
  const relevantAddonsToList = projectAddon.addons.filter(
    (addon) => !['log_drain', 'auth_mfa_phone'].includes(addon.type)
  )

  const addonNames = relevantAddonsToList.map((addon) => {
    if (addon.type === 'compute_instance') return `${addon.variant.name} Compute Instance`
    return addon.variant.name
  })

  return (
    <li className="list-disc ml-6">
      {projectAddon.name}: {addonNames.join(', ')} will be removed.
      {needsRestart ? (
        <>
          {' '}
          Project will also <span className="font-bold">need to be restarted</span> due to change in
          compute instance
        </>
      ) : (
        ''
      )}
    </li>
  )
}

const DowngradeModal = ({
  visible,
  subscription,
  onClose,
  onConfirm,
  projects,
}: DowngradeModalProps) => {
  const selectedPlan = useMemo(() => subscriptionsPlans.find((tier) => tier.id === 'tier_free'), [])

  // Filter out the micro addon as we're dealing with that separately
  const previousProjectAddons =
    subscription?.project_addons.flatMap((projectAddons) => {
      const addons = projectAddons.addons.filter((it) => it.variant.identifier !== 'ci_micro')
      if (!addons.length) {
        return []
      } else {
        return {
          ...projectAddons,
          // Overwrite addons, filtered out the micro addon
          addons,
        }
      }
    }) || []

  const hasInstancesOnMicro = projects.some((project) => project.infra_compute_size === 'micro')

  return (
    <Modal
      size="large"
      alignFooter="right"
      variant="warning"
      visible={visible}
      onCancel={onClose}
      onConfirm={onConfirm}
      header={`Confirm to downgrade to ${selectedPlan?.name} plan`}
    >
      <Modal.Content>
        <div className="space-y-2">
          <Admonition
            type="warning"
            title="Downgrading to the Free Plan will lead to reductions in your organization's quota"
            description="If you're already past the limits of the Free Plan, your projects could become
              unresponsive or enter read only mode."
          />

          {((previousProjectAddons.length ?? 0) > 0 || hasInstancesOnMicro) && (
            <Admonition type="warning" title="Projects affected by the downgrade">
              <ul className="space-y-1 max-h-[100px] overflow-y-auto">
                {previousProjectAddons.map((project) => (
                  <ProjectDowngradeListItem key={project.ref} projectAddon={project} />
                ))}

                {projects
                  .filter((it) => it.infra_compute_size === 'micro')
                  .map((project) => (
                    <li className="list-disc ml-6" key={project.ref}>
                      {project.name}: Compute will be downgraded. Project will also{' '}
                      <span className="font-bold">need to be restarted</span>.
                    </li>
                  ))}
              </ul>
            </Admonition>
          )}
        </div>

        <ul className="mt-4 space-y-5 text-sm">
          <li className="flex items-center gap-3">
            <PauseCircle size={18} />
            <span>Projects will be paused after a week of inactivity</span>
          </li>

          <li className="flex items-center gap-3 mb-2">
            <MinusCircle size={18} />
            <span>Add ons from all projects under this organization will be removed.</span>
          </li>

          <li className="flex gap-3">
            <div>
              <strong>Before you downgrade to the {selectedPlan?.name} plan, consider:</strong>
              <ul className="space-y-2 mt-2">
                <li className="list-disc ml-6 text-foreground-light">
                  Your projects no longer require their respective add ons.
                </li>
                <li className="list-disc ml-6 text-foreground-light">
                  Your resource consumption are well within the {selectedPlan?.name} plan's quota.
                </li>
                <li className="list-disc ml-6 text-foreground-light">
                  Alternatively, you may also transfer projects across organizations.
                </li>
              </ul>
            </div>
          </li>
        </ul>

        {subscription?.billing_via_partner === true && subscription.billing_partner === 'fly' && (
          <p className="mt-4 text-sm">
            Your organization will be downgraded at the end of your current billing cycle.
          </p>
        )}
      </Modal.Content>
    </Modal>
  )
}

export default DowngradeModal
