/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Bond } from '../../../mol-model/structure';
import { Color, ColorScale } from '../../../mol-util/color';
import { Location } from '../../../mol-model/location';
import { Vec3 } from '../../../mol-math/linear-algebra';
import { ParamDefinition as PD } from '../../../mol-util/param-definition'
import { ThemeDataContext } from '../../../mol-theme/theme';
import { ColorListName, ColorListOptionsScale } from '../../../mol-util/color/lists';
import { ColorTheme, LocationColor } from '../../../mol-theme/color';
import { CustomProperty } from '../../common/custom-property';
import { CrossLinkRestraintProvider, CrossLinkRestraint } from './property';

const DefaultColor = Color(0xCCCCCC)
const Description = 'Colors cross-links by the deviation of the observed distance versus the modeled distance (e.g. modeled / `ihm_cross_link_restraint.distance_threshold`).'

export const CrossLinkColorThemeParams = {
    domain: PD.Interval([0.5, 2], { step: 0.01 }),
    list: PD.ColorList<ColorListName>('red-grey', ColorListOptionsScale),
}
export type CrossLinkColorThemeParams = typeof CrossLinkColorThemeParams
export function getCrossLinkColorThemeParams(ctx: ThemeDataContext) {
    return CrossLinkColorThemeParams // TODO return copy
}

const distVecA = Vec3.zero(), distVecB = Vec3.zero()
function linkDistance(link: Bond.Location) {
    link.aUnit.conformation.position(link.aUnit.elements[link.aIndex], distVecA)
    link.bUnit.conformation.position(link.bUnit.elements[link.bIndex], distVecB)
    return Vec3.distance(distVecA, distVecB)
}

export function CrossLinkColorTheme(ctx: ThemeDataContext, props: PD.Values<CrossLinkColorThemeParams>): ColorTheme<CrossLinkColorThemeParams> {
    let color: LocationColor
    let scale: ColorScale | undefined = undefined

    const crossLinkRestraints = ctx.structure && CrossLinkRestraintProvider.get(ctx.structure).value

    if (crossLinkRestraints) {
        scale = ColorScale.create({
            domain: props.domain,
            listOrName: props.list
        })
        const scaleColor = scale.color

        color = (location: Location): Color => {
            if (Bond.isLocation(location)) {
                const pairs = crossLinkRestraints.getPairs(location.aIndex, location.aUnit, location.bIndex, location.bUnit)
                if (pairs) {
                    return scaleColor(linkDistance(location) / pairs[0].distanceThreshold)
                }
            }
            return DefaultColor
        }
    } else {
        color = () => DefaultColor
    }

    return {
        factory: CrossLinkColorTheme,
        granularity: 'group',
        color,
        props,
        description: Description,
        legend: scale ? scale.legend : undefined
    }
}

export const CrossLinkColorThemeProvider: ColorTheme.Provider<CrossLinkColorThemeParams> = {
    label: 'Cross Link',
    factory: CrossLinkColorTheme,
    getParams: getCrossLinkColorThemeParams,
    defaultValues: PD.getDefaultValues(CrossLinkColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => !!ctx.structure && CrossLinkRestraint.isApplicable(ctx.structure),
    ensureCustomProperties: (ctx: CustomProperty.Context, data: ThemeDataContext) => {
        return data.structure ? CrossLinkRestraintProvider.attach(ctx, data.structure) : Promise.resolve()
    }
}