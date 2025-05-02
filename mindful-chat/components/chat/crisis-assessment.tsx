'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Phone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'

// Crisis keywords to detect in messages
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'self harm',
  'hurt myself', 'harming myself', 'cutting myself', 'overdose',
  'no reason to live', 'can\'t go on', 'can\'t take it anymore',
  'better off dead', 'hopeless', 'giving up', 'emergency',
  'immediate help', 'crisis', 'unsafe'
]

// Crisis resources to display in the dialog (Malaysia-specific)
const CRISIS_RESOURCES = [
  {
    name: 'Befrienders KL',
    description: '24-hour emotional support helpline in Malaysia',
    phone: '03-7956-8145',
    actionText: 'Call 03-7956-8145'
  },
  {
    name: 'Malaysia Mental Health Association',
    description: 'Support and resources for mental health issues',
    phone: '03-2780-6803',
    actionText: 'Call 03-2780-6803'
  },
  {
    name: 'SOLS Health',
    description: 'Mental health services including therapy and counseling',
    phone: '018-999-2830',
    actionText: 'Call 018-999-2830'
  },
  {
    name: 'Talian Kasih Helpline',
    description: '24-hour national crisis helpline by Malaysian Ministry of Women',
    phone: '15999',
    actionText: 'Call 15999'
  },
  {
    name: 'Befrienders Penang',
    description: 'Emotional support helpline for northern Malaysia',
    phone: '04-281-5161',
    actionText: 'Call 04-281-5161'
  }
]

interface CrisisAssessmentProps {
  messageContent: string
  onClose: () => void
}

export function CrisisAssessment({ messageContent, onClose }: CrisisAssessmentProps) {
  const [showDialog, setShowDialog] = useState(false)
  
  // Check if message contains crisis keywords
  useEffect(() => {
    const lowerCaseMessage = messageContent.toLowerCase()
    const hasCrisisIndicator = CRISIS_KEYWORDS.some(keyword => 
      lowerCaseMessage.includes(keyword.toLowerCase())
    )
    
    if (hasCrisisIndicator) {
      setShowDialog(true)
    }
  }, [messageContent])
  
  const handleClose = () => {
    setShowDialog(false)
    onClose()
  }
  
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            Crisis Support Resources
          </DialogTitle>
          <DialogDescription>
            This message may indicate a mental health emergency. If you or someone else is in immediate danger, please call emergency services (911) right away.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
          {CRISIS_RESOURCES.map((resource, index) => (
            <Card key={index} className="border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{resource.name}</CardTitle>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full border-red-200 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                  onClick={() => {
                    // In a real app, this would handle the phone call action
                    window.location.href = `tel:${resource.phone.replace(/[^0-9]/g, '')}`
                  }}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  {resource.actionText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground mb-3 sm:mb-0">
            These resources are available 24/7 and are completely confidential.
          </p>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
