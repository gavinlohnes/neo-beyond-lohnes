package app.beyond.healthbridge

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.widget.Button
import android.widget.LinearLayout

/** BRIDGE-LOOK-001: BEYOND's own tokens (src/ui/styles/tokens.css), drawn in code, no theme library. */
object Look {
    val BG = Color.parseColor("#000000")
    val SURFACE = Color.parseColor("#0f0f0f")
    val BORDER = Color.parseColor("#3a3a3a")
    val TEXT_1 = Color.parseColor("#f2f2f2")
    val TEXT_2 = Color.parseColor("#a8a8a8")
    val TEXT_3 = Color.parseColor("#8c8c8c")
    val RED = Color.parseColor("#D0141B")

    private fun box(fill: Int, stroke: Int, dp: Float) = GradientDrawable().apply { setColor(fill); setStroke(dp.toInt().coerceAtLeast(1), stroke); cornerRadius = 0f }

    /** The status panel: a dark, square-cornered box with a 1px line, as BEYOND draws its cards. */
    fun panel(dp: Float) = box(SURFACE, BORDER, dp)

    fun spaced(dp: Float, top: Int) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (top * dp).toInt() }

    /** One red primary action per screen; everything else outlined. Disabled reads dim, never hidden. */
    fun button(context: Context, label: String, primary: Boolean, dp: Float) = Button(context).apply {
        text = label
        isAllCaps = true
        letterSpacing = 0.12f
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        textSize = 15f
        minHeight = (52 * dp).toInt()
        stateListAnimator = null
        background = StateListDrawable().apply {
            addState(intArrayOf(-android.R.attr.state_enabled), box(BG, Color.parseColor("#2a2a2a"), dp))
            addState(intArrayOf(android.R.attr.state_pressed), box(if (primary) Color.parseColor("#a80f15") else SURFACE, if (primary) RED else TEXT_2, dp))
            addState(intArrayOf(), box(if (primary) RED else BG, if (primary) RED else BORDER, dp))
        }
        setTextColor(ColorStateList(arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()), intArrayOf(Color.parseColor("#5a5a5a"), TEXT_1)))
    }
}
