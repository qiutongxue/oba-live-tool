import { mergeWith } from 'lodash-es'

function arrayReplaceCustomizer<Value1, Value2>(
  _objValue: Value1,
  srcValue: Value2,
) {
  if (Array.isArray(srcValue)) {
    // 如果源对象的属性值是一个数组 (即 configUpdates 里的值是数组)，
    // 则直接返回这个源数组，它将替换掉目标对象中的对应数组。
    return srcValue
  }
}

/**
 * 使用 lodash.merge 合并对象，但是不会合并数组
 */
export function mergeWithoutArray<Object1, Object2>(
  objValue: Object1,
  srcValue: Object2,
): Object1 & Object2 {
  return mergeWith({}, objValue, srcValue, arrayReplaceCustomizer)
}
