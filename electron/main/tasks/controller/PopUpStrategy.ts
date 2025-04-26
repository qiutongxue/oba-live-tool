import type { ElementHandle } from 'playwright'
import { sleep } from '#/utils'

export type PopUpStrategy = (
  element: ElementHandle<SVGElement | HTMLElement>,
) => Promise<void>

const redbookPopUpStrategy: PopUpStrategy = async element => {
  await element.click()
}

const douyinPopUpStrategy: PopUpStrategy = async button => {
  const clickPopUpButton = async (
    button: ElementHandle<SVGElement | HTMLElement>,
  ) => {
    const buttonText = await button.textContent()
    if (buttonText !== '取消讲解' && buttonText !== '讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await button.dispatchEvent('click')
    return buttonText
  }

  while ((await clickPopUpButton(button)) === '取消讲解') {
    await sleep(1000)
  }
}

const wxchannelPopUpStrategy: PopUpStrategy = async button => {
  const clickPopUpButton = async (
    button: ElementHandle<SVGElement | HTMLElement>,
  ) => {
    const buttonText = (await button.textContent())?.trim()
    if (buttonText !== '结束讲解' && buttonText !== '讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await button.dispatchEvent('click')
    return buttonText
  }

  while ((await clickPopUpButton(button)) === '结束讲解') {
    await sleep(1000)
  }
}

export function getPopUpStrategy(platform: LiveControlPlatform): PopUpStrategy {
  switch (platform) {
    case 'redbook':
      return redbookPopUpStrategy
    case 'wxchannel':
      return wxchannelPopUpStrategy
    default:
      return douyinPopUpStrategy
  }
}
