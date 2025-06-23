import type { ElementHandle, Page } from 'playwright'
import { kuaishou } from '#/constants'
import { createLogger } from '#/logger'
import { sleep } from '#/utils'

export type PopUpStrategy = (
  element: ElementHandle<SVGElement | HTMLElement>,
  page: Page,
  getButton: () => Promise<ElementHandle<SVGElement | HTMLElement>>,
) => Promise<void>

const logger = createLogger('弹窗')

const redbookPopUpStrategy: PopUpStrategy = async element => {
  // 使用 dispatchEvent 避免元素未处于可见区时产生滚动 BUG
  await element.dispatchEvent('click')
}

const togglePopUp = async (
  button: ElementHandle<SVGElement | HTMLElement>,
  promote: string,
  cancelPromote: string,
) => {
  const clickPopUpButton = async (
    button: ElementHandle<SVGElement | HTMLElement>,
  ) => {
    const buttonText = (await button.textContent())?.trim()
    if (buttonText !== cancelPromote && buttonText !== promote) {
      throw new Error(`不是${promote}按钮，是 ${buttonText} 按钮`)
    }
    await button.dispatchEvent('click')
    return buttonText
  }

  while ((await clickPopUpButton(button)) === cancelPromote) {
    await sleep(1000)
  }
}

const douyinPopUpStrategy: PopUpStrategy = async button => {
  await togglePopUp(button, '讲解', '取消讲解')
}

const wxchannelPopUpStrategy: PopUpStrategy = async button => {
  await togglePopUp(button, '讲解', '结束讲解')
}

const kuaishouPopUpStrategy: PopUpStrategy = async (
  button,
  page,
  getButton,
) => {
  const buttonText = (await button.textContent())?.trim()
  if (buttonText !== '结束讲解' && buttonText !== '开始讲解') {
    throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
  }
  await button.dispatchEvent('click')
  // 判断是否会出现 modal
  const modalNextButton = await page
    .waitForSelector(kuaishou.selectors.goodsItem.POPUP_CONFIRM_BUTTON, {
      timeout: 500,
    })
    .catch(() => null)
  // 出现了就点击“确定”
  if (modalNextButton) {
    await modalNextButton.dispatchEvent('click')
  }

  // 结束讲解 - 需要再次开始讲解
  if (buttonText === '结束讲解') {
    logger.debug('已结束原来的讲解')
    // FIXME: 是否为了以防万一需要等待一段时间？
    await sleep(100)
    // 注意：此时无法使用原先的按钮，需要重新查找
    const newButton = await getButton()
    const newButtonText = await newButton.textContent()
    if (newButtonText !== '开始讲解') {
      throw new Error(`无法开始新的讲解，讲解按钮为：${newButtonText}`)
    }
    newButton.dispatchEvent('click')
  }
  logger.debug('开始新的讲解')
}

export function getPopUpStrategy(platform: LiveControlPlatform): PopUpStrategy {
  switch (platform) {
    case 'redbook':
    case 'taobao':
      return redbookPopUpStrategy
    case 'wxchannel':
      return wxchannelPopUpStrategy
    case 'kuaishou':
      return kuaishouPopUpStrategy
    case 'buyin':
    case 'douyin':
    case 'eos':
      return douyinPopUpStrategy
  }
}
